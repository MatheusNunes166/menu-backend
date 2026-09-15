/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuestCheck, GuestCheckStatus } from './guest-check.entity';
import { CreateGuestCheckDto } from './dto/create-guest-check';
import { Spot } from '../spots/spot.entity';

@Injectable()
export class GuestCheckService {
  constructor(
    @InjectRepository(GuestCheck)
    private readonly guestCheckRepository: Repository<GuestCheck>,

    @InjectRepository(Spot)
    private readonly spotRepository: Repository<Spot>,
  ) {}

  async create(dto: CreateGuestCheckDto): Promise<GuestCheck> {
    const spot = await this.spotRepository.findOneBy({
      id: dto.spotId,
      active: true,
    });

    if (!spot) {
      throw new Error('Mesa não encontrada ou inativa');
    }

    const opened = await this.guestCheckRepository.exists({
      where: {
        spot: { id: dto.spotId },
        status: GuestCheckStatus.OPENED,
      },
    });
    if (opened) {
      throw new ConflictException(
        'Já existe uma comanda aberta para esta mesa',
      );
    }

    const guestCheck = this.guestCheckRepository.create({
      spot,
      status: GuestCheckStatus.OPENED,
    });

    return this.guestCheckRepository.save(guestCheck);
  }

  async findOne(id: string): Promise<GuestCheck> {
    const guestCheck = await this.guestCheckRepository.findOneBy({ id });
    if (!guestCheck) {
      throw new NotFoundException('Comanda não encontrada!');
    }
    return guestCheck;
  }

  async close(id: string): Promise<GuestCheck> {
    const guestCheck = await this.findOne(id);

    if (guestCheck.status === GuestCheckStatus.CLOSED) {
      throw new BadRequestException('Comanda já está fechada');
    }

    guestCheck.status = GuestCheckStatus.CLOSED;
    return this.guestCheckRepository.save(guestCheck);
  }

  findOpenedBySpot(spotId: string): Promise<GuestCheck | null> {
    return this.guestCheckRepository.findOne({
      where: {
        spot: { id: spotId },
        status: GuestCheckStatus.OPENED,
      },
      relations: { spot: true },
    });
  }
  async findOrCreateOpened(spotId: string): Promise<GuestCheck> {
    const opened = await this.findOpenedBySpot(spotId);
    if (opened) {
      return opened;
    }
    return this.create({ spotId });
  }
}
