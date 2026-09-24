export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg: string) => new HttpError(400, 'VALIDATION', msg);
export const unauthorized = (msg = 'Oturum geçersiz. Lütfen tekrar giriş yap.') => new HttpError(401, 'UNAUTHORIZED', msg);
export const notFound = (msg = 'Kayıt bulunamadı.') => new HttpError(404, 'NOT_FOUND', msg);
export const noCredits = (need: number) => new HttpError(402, 'NO_CREDITS', `Bu işlem için ${need} kredi gerekiyor. Cüzdanından kredi alabilirsin.`);
export const noQuestions = () => new HttpError(402, 'NO_QUESTIONS', 'Soru hakkın bitti. Cüzdandan soru paketi alabilirsin.');
