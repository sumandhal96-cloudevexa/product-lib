export const formatPrice = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

/** "men's clothing" -> "Men's clothing" */
export const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
