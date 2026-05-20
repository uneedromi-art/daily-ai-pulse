'use client';

import { useState } from 'react';
import KeywordSettings from './KeywordSettings';
import PostList from './PostList';

export default function NewsFeed({ initialPosts = [] }) {
    const [keywordFilter, setKeywordFilter] = useState(null);

    return (
        <>
            <KeywordSettings onFilterChange={setKeywordFilter} />
            <PostList initialPosts={initialPosts} keywordFilter={keywordFilter} />
        </>
    );
}
