const fromString = (): never => {
  throw new Error('canvg no está incluido en el bundle (deshabilitado en vite.config.ts)');
};

const stub = {
  fromString,
  from: fromString,
  render: fromString,
};

export default stub;
