import { entityApi } from './lib/entity'
import { BLOG_POST_FIELDS } from './lib/fields'

// Module name is camelCase (api.blogPosts.*); the table stays `blog_posts`.
export const { list, get, count, create, update, remove } = entityApi(
  'blog_posts',
  BLOG_POST_FIELDS,
)
