import { Injectable } from '@nestjs/common';
import { CreateRelationDto } from './dto/create-relation.dto';
import { UpdateRelationDto } from './dto/update-relation.dto';
import { DataSource, Repository } from 'typeorm';
import { Relation } from './entities/relation.entity';
import { Service } from '../service/Service';

@Injectable()
export class RelationService extends Service {
  private relationRepository: Repository<Relation>;

  constructor(private dataSource: DataSource) {
    super();
    this.relationRepository = this.dataSource.getRepository(Relation);
  }

  create(createRelationDto: CreateRelationDto) {
    const relation = new Relation();

    relation.fromId = createRelationDto.fromId;
    relation.toId = createRelationDto.toId;
    relation.baseType = createRelationDto.baseType;
    relation.objectType = createRelationDto.objectType;
    relation.relationType = createRelationDto.relationType;
    relation.relatedBaseType = createRelationDto.relatedBaseType;
    relation.relatedObjectType = createRelationDto.relatedObjectType;

    try {
      return this.relationRepository.save(relation);
    } catch (e) {
      this.log.error({ error: e.message }, 'Error during creating relation');
    }
  }

  findAll() {
    return `This action returns all relation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} relation`;
  }

  update(id: number, updateRelationDto: UpdateRelationDto) {
    return `This action updates a #${id} relation`;
  }

  remove(id: number) {
    return `This action removes a #${id} relation`;
  }
}
