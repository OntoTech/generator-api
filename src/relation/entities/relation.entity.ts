import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('relations')
export class Relation {
  @PrimaryColumn({ default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'from_id' })
  fromId: string;

  @Column({ name: 'to_id' })
  toId: string;

  @Column({ name: 'base_type' })
  baseType: string;

  @Column({ name: 'object_type' })
  objectType: string;

  @Column({ name: 'relation_type' })
  relationType: string;

  @Column({ name: 'related_base_type' })
  relatedBaseType: string;

  @Column({ name: 'related_object_type' })
  relatedObjectType: string;
}
