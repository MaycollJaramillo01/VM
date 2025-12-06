import { ZodError } from 'zod';

export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
      req.validated = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
      next(err);
    }
  };
}
