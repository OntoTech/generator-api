import { DataSource } from 'typeorm';
import { Global, Module } from '@nestjs/common';
import { AppDataSource } from './app-data-source';

@Global()
@Module({
    imports: [],
    providers: [
        {
            provide: DataSource,
            inject: [],
            useFactory: async () => {
                try {
                    await AppDataSource.initialize();
                    console.log('Database connected successfully');
                    return AppDataSource;
                } catch (error) {
                    console.log('Error connecting to database');
                    throw error;
                }
            },
        },
    ],
    exports: [DataSource],
})
export class TypeOrmModule {}
