'use client';

import Header from './Header';
import PostList from './PostList';

export default function NewsFeed({ initialPosts = [] }) {
    return (
        <>
            <Header />
            <PostList initialPosts={initialPosts} />
        </>
    );
}
