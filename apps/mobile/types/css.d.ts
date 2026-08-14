// CSS imports come from the Expo template's web build and have no types.
declare module "*.css";
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
