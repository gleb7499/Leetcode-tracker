import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  remember: z.boolean().optional(),
});

export const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Za-z]/, 'Must contain letters')
      .regex(/\d/, 'Must contain digits'),
    passwordConfirm: z.string(),
    terms: z.literal(true, {
      error: 'You must accept the terms',
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

export const TaskSchema = z.object({
  url: z.string().url('Enter a valid URL'),
  name: z.string().min(3, 'Minimum 3 characters').max(200, 'Maximum 200 characters'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard'], {
    error: 'Select difficulty',
  }),
  topics: z.string().optional(),
  notes: z.string().optional(),
});

export const LeetCodeTaskUrlSchema = z
  .string()
  .trim()
  .min(1, 'LeetCode URL is required')
  .url('Enter a valid URL')
  .refine((value) => {
    try {
      const url = new URL(value);
      const isLeetCodeHost =
        url.hostname === 'leetcode.com' || url.hostname === 'www.leetcode.com';
      const hasProblemPath = /^\/problems\/[^/]+\/?$/.test(url.pathname);
      return isLeetCodeHost && hasProblemPath;
    } catch {
      return false;
    }
  }, 'Enter a valid LeetCode problem URL');

export const LeetCodeTaskUrlFormSchema = z.object({
  url: LeetCodeTaskUrlSchema,
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export type LoginFormData = z.infer<typeof LoginSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type TaskFormData = z.infer<typeof TaskSchema>;
export type LeetCodeTaskUrlFormData = z.infer<typeof LeetCodeTaskUrlFormSchema>;
export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;
