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

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post }: PostProps) {
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

  return (
    <>
      <Head>
        <title> | Spacetraveling</title>
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
        </header>

        {post.data.content.map(content => (
          <div className={styles.post} key={content.heading}>
            <h2>{content.heading}</h2>
            <div className={styles.postBody} dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }} />
          </div>
        ))}
        
      </main>
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

export const getStaticProps = async ({params}) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {});

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
      post
    },
    revalidate: 3600
  }

};
