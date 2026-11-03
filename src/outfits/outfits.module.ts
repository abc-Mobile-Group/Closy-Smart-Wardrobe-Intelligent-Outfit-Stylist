import { Module } from '@nestjs/common';
import { WardrobeModule } from '../wardrobe/wardrobe.module';
import { OutfitsController } from './outfits.controller';
import { OutfitsService } from './outfits.service';

@Module({ imports: [WardrobeModule], controllers: [OutfitsController], providers: [OutfitsService] })
export class OutfitsModule {}
