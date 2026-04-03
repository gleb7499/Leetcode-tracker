import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  remember: z.boolean().optional(),
});

export const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Минимум 2 символа').max(50, 'Максимум 50 символов'),
    email: z.string().email('Введите корректный email'),
    password: z
      .string()
      .min(8, 'Минимум 8 символов')
      .regex(/[A-Za-z]/, 'Должен содержать буквы')
      .regex(/\d/, 'Должен содержать цифры'),
    passwordConfirm: z.string(),
    terms: z.literal(true, {
      error: 'Необходимо принять условия',
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Пароли не совпадают',
    path: ['passwordConfirm'],
  });

export const TaskSchema = z.object({
  url: z.string().url('Введите корректный URL'),
  name: z.string().min(3, 'Минимум 3 символа').max(200, 'Максимум 200 символов'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard'], {
    error: 'Выберите сложность',
  }),
  topics: z.string().optional(),
  notes: z.string().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

export type LoginFormData = z.infer<typeof LoginSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type TaskFormData = z.infer<typeof TaskSchema>;
export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;
