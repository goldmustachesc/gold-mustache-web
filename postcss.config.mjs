const config = {
  plugins: {
    "@tailwindcss/postcss":
      process.env.NODE_ENV === "production"
        ? { optimize: true }
        : {
            optimize: {
              minify: false,
            },
          },
  },
};

export default config;
