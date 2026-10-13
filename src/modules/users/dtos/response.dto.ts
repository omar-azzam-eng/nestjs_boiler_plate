export class UserResponseDTO {
  constructor(
    public id: string,
    public email: string,
    public name?: string,
    public phone?: string,
  ) {}
}
