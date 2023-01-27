import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';


@Entity()
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  winner: string

  @Column({ nullable: true })
  whoseTurn: string

  @Column({ default: 0 })
  gamersCount: number

  @OneToMany(() => UserEntity, user => user.session, { onDelete: 'NO ACTION' })
  users: UserEntity[]
}
