import { entityApi } from './lib/entity'
import { AGENT_FIELDS } from './lib/fields'

export const { list, get, count, create, update, remove } = entityApi(
  'agents',
  AGENT_FIELDS,
)
