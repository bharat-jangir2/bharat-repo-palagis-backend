import { PaginationDto } from './pagination.dto';

export class SavedLocationFilterDto extends PaginationDto {
  // Only pagination fields (page, limit) are allowed
  // No additional filters needed for now
}
