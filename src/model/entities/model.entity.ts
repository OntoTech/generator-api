import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { IModel } from '../../util/types';

@Entity('models')
export class Model {
  @PrimaryColumn({ default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ unique: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: string;

  @UpdateDateColumn({ nullable: true, name: 'updated_at' })
  updatedAt: string;

  @Column({
    type: 'jsonb',
    array: false,
    default: () => "'{}'",
    nullable: false,
  })
  data: IModel;
}
