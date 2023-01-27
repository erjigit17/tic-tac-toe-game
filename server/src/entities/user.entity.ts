import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SessionEntity } from './session.entity';

@Entity()
export class UserEntity {
  @PrimaryColumn() // get id from websocket client
  id: string

  @Column({ default: false })
  banned: boolean

  @ManyToOne(() => SessionEntity, session => session.users, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'sessionId' })
  session: SessionEntity
}
