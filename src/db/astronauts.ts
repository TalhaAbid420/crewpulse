import type { Astronaut } from '../sim'
import { db } from './database'

/** The whole crew, in crew order (astro-1, astro-2, ...). */
export function getAstronauts(): Promise<Astronaut[]> {
  return db.astronauts.orderBy('id').toArray()
}

export function getAstronaut(id: string): Promise<Astronaut | undefined> {
  return db.astronauts.get(id)
}
