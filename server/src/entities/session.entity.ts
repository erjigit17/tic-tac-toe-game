import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';
import { RoundEntity } from './roundEntity';


@Entity()
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  winner: string

  @Column({ default: true })
  isWaitingSecondGamer: boolean

  @OneToMany(() => UserEntity, user => user.session, { onDelete: 'NO ACTION' })
  users: UserEntity[]

  @OneToMany(() => RoundEntity, round => round.session, { onDelete: 'NO ACTION' })
  rounds: RoundEntity[]
}
