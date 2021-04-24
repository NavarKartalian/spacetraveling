import { GetStaticPaths, GetStaticProps } from 'next';
import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header'
import Head from 'next/head'
import { useRouter } from 'next/router';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RichText } from 'prismic-dom';
import Comments from '../../components/Comments';
import Link from 'next/link';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      }
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      }
    }[];
  }
}

export default function Post({ post, preview, navigation }: PostProps) {
  const router = useRouter();

  if(router.isFallback) {
    return (
      <h2>Carregando...</h2>
    )
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);
  const readTime = Math.ceil(totalWords / 200);

  const isPostEdited =
    post.first_publication_date !== post.last_publication_date;

  let editionDate;
  if (isPostEdited) {
    editionDate = format(
      new Date(post.last_publication_date),
      "'* editado em' dd MMM yyyy', às' H':'m",
      {
        locale: ptBR,
      }
    );
  }

  return (
    <>
      <Head>
        <title>{post.data.title}</title>
      </Head>

      <Header />

      <img src={post.data.banner.url} alt="banner" className={styles.banner}/>

      <main className={commonStyles.container}>
        <header className={styles.postHeader}>
          <h2>{post.data.title}</h2>
          <ul>
            <li>
              <p>
                <FiCalendar/>
                {format(
                  new Date(post.first_publication_date),
                  'dd MMM yyyy',
                  {
                    locale: ptBR,
                  }
                  )}
              </p>
            </li>

            <li>
            <p>
              <FiUser/>
              {post.data.author}
            </p>
            </li>

            <li>
              <p>
                <FiClock />
                {`${readTime} min`}
              </p>
            </li>
          </ul>
          {isPostEdited && <span>{editionDate}</span>}
        </header>

        {post.data.content.map(content => (
          <div className={styles.post} key={content.heading}>
            <h2>{content.heading}</h2>
            <div className={styles.postBody} dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }} />
          </div>
        ))}

        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.preview}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>

      <section className={`${styles.navigation} ${commonStyles.container}`}>
        {navigation?.prevPost.length > 0 && (
          <Link href={navigation.prevPost[0].uid}>
            <button type='button' className={styles.prev}>
              <h2>{navigation.prevPost[0].data.title}</h2>
              <a>Post anterior</a>
            </button>
          </Link>
        )}

        {navigation?.nextPost.length > 0 && (
          <Link href={navigation.nextPost[0].uid}>
            <button type='button' className={styles.next}>
              <h2>{navigation.nextPost[0].data.title}</h2>
              <a>Proximo post</a>
            </button>
          </Link>
        )}
      </section>

      <Comments />
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([Prismic.Predicates.at('document.type', 'posts')]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid
      }
    }
  })

  return {
    paths,
    fallback: true
  }

};

export const getStaticProps = async ({ params, preview = false, previewData }) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {ref: previewData?.ref || null,});

  const prevPost = await prismic.query([Prismic.Predicates.at('document.type', 'posts')],
  {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date]'
  }
  );

  const nextPost = await prismic.query([Prismic.Predicates.at('document.type', 'posts')],
  {
    pageSize: 1,
    after: response.id,
    orderings: '[document.last_publication_date]'
  }
  );
  

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  }

  return {
    props: {
      post,
      preview,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results
      }
    },
    revalidate: 3600
  }

};
