export class UserResponseDTO {
  constructor(
    private id: string,
    private email: string,
    private name?: string,
    private phone?: string,
  ) {}
}
