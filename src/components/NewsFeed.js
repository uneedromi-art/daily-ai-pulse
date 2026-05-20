'use client';

import { useState } from 'react';
import Header from './Header';
import PostList from './PostList';

export default function NewsFeed({ initialPosts = [] }) {
    const [keywordFilter, setKeywordFilter] = useState(null);

    return (
        <>
            <Header onFilterChange={setKeywordFilter} />
            <PostList initialPosts={initialPosts} keywordFilter={keywordFilter} />
        </>
    );
}
