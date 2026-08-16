import { entityApi } from './lib/entity'
import { PROPERTY_FIELDS } from './lib/fields'

export const { list, get, count, create, update, remove } = entityApi(
  'properties',
  PROPERTY_FIELDS,
)
