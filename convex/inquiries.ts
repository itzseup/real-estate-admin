import { entityApi } from './lib/entity'
import { INQUIRY_FIELDS } from './lib/fields'

export const { list, get, count, create, update, remove } = entityApi(
  'inquiries',
  INQUIRY_FIELDS,
)
