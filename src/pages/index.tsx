import { GetStaticProps } from 'next';
import Head from 'next/head'
import { getPrismicClient } from '../services/prismic';
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { useState } from 'react';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

 export default function Home({ postsPagination, preview }: HomeProps) {

  const [nextPage, setNextPage] = useState(postsPagination.next_page);
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [curPage, setCurPage] = useState(1);


  async function handlePosts() {
    if(curPage != 1 && nextPage === null) {
      return;
    }
    const nextPageResults = await fetch(`${nextPage}`).then(response => response.json());
    
    setCurPage(nextPageResults.page);
    setNextPage(nextPageResults.next_page);

    const loadedPosts = nextPageResults.results.map(post => {
      return {
        uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR
        }
      ),
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    }
    })

    setPosts([...posts, ...loadedPosts]);

  }
  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <main className={commonStyles.container}>
        <header className={styles.header}>
          <img src="/images/Logo.svg" alt="logo"/>
        </header>

        <div className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <h2>{post.data.title}</h2>
                <p>{post.data.subtitle}</p>
                <ul>
                  <li>
                    <time>
                      <FiCalendar/>
                      {format(
                        new Date(post.first_publication_date),
                        'dd MMM yyyy',
                        {
                          locale: ptBR,
                        }
                      )}
                    </time>
                  </li>
                  
                  <li>
                    <p>
                      <FiUser/>
                      {post.data.author}
                    </p>
                  </li>
                </ul>
              </a>
            </Link>
          ))}
        </div>
        
        {nextPage && (
          <button className={styles.button} onClick={handlePosts}>
            Carregar mais posts
          </button>
          )}

          {preview && (
            <aside>
              <Link href="/api/exit-preview">
                <a className={commonStyles.preview}>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ preview = false }) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ], {
    pageSize: 20,
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    }
  })
  
  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };
  
  return {
    props: {
      postsPagination,
      preview
    },
    revalidate: 3600,
  }

  };
