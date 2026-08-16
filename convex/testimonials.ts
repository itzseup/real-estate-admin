import { entityApi } from './lib/entity'
import { TESTIMONIAL_FIELDS } from './lib/fields'

export const { list, get, count, create, update, remove } = entityApi(
  'testimonials',
  TESTIMONIAL_FIELDS,
)
