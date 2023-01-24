import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // @Column() // sqlite doesn't support array type
  // gamers: string[]

  @Column()
  firstGamerId: string

  @Column({ nullable: true })
  secondGamerId: string

  @Column({ nullable: true })
  winner: number

  @Column({ nullable: true })
  whoseTurn: number

  @Column({ default: true })
  isActive: boolean
}
