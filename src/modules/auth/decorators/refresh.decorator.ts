import { SetMetadata } from '@nestjs/common';

export const REFRESH_KEY = 'refresh';
export const Refresh = () => SetMetadata(REFRESH_KEY, true);
