export function validateJsonBody(error, _req, res, next) {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ message: "JSON non valido" });
  }
  return next(error);
}
