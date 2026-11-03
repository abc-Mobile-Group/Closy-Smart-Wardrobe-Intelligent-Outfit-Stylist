import { Module } from '@nestjs/common';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { OutfitsModule } from './outfits/outfits.module';
import { HealthController } from './health.controller';

@Module({ imports: [WardrobeModule, OutfitsModule], controllers: [HealthController] })
export class AppModule {}
