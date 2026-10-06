# Architecture rules

- Keep the privacy policy text in one shared content source and use it for the in-app page and standalone exports so disclosures remain consistent.
- Keep the home screen immediately available and load secondary pages through React lazy imports with a shared Suspense boundary to reduce startup work without resetting navigation or lock state.
- Use the shared DeleteConfirmation dialog for irreversible content deletion so confirmation copy and actions remain consistent across features.