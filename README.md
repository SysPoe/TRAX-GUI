# TRAX-GUI

A GUI for [TRAX](https://github.com/SysPoe/TRAX/), a Translink Rail API wrapper.

## Simple Installation (Development)

To run this project locally for development purposes, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SysPoe/TRAX-GUI
    cd trax-gui
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the application:**
    Navigate to `http://localhost:5173` (or the URL shown in your terminal) to view the application.

    *Note: The default admin password is set to `admin`.*

## Production Environment

For a more production-ready environment, you should build the application and set the necessary environment variables.

### Environment Variables

Before running in production, ensure you set the following environment variables to secure your application:

*   `TRAX_GUI_SESSION_SECRET`: A secret key for session management.
*   `TRAX_GUI_ADMIN_PASS`: The password for the admin interface.

### Build and Run

1.  **Build the application:**
    ```bash
    npm run build
    ```

2.  **Preview the production build:**
    You can preview the built application locally using:
    ```bash
    npm run preview
    ```

    *Note: For actual deployment, you may want to configure a specific SvelteKit adapter (like `@sveltejs/adapter-node`) suitable for your hosting environment.*
