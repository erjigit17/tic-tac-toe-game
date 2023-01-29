import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SessionEntity } from './session.entity';


@Entity()
export class RoundEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  winnerId: string

  @Column({ default: false })
  draw: boolean

  @Column()
  firstGamerId: string

  @Column()
  secondGamerId: string

  @Column()
  board: string

  @Column()
  gamer: string

  @Column()
  expiration: Date

  @Column({ default: false })
  isFinished: boolean

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => SessionEntity, session => session.rounds, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'sessionId' })
  session: SessionEntity
}
