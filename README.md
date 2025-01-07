# System Security Checker (Node.js version)

This Node.js script uses osquery to check various security aspects of your system, including disk encryption, antivirus protection, and screen lock settings.

## Prerequisites

- Node.js 16 or higher
- osquery installed on your system

## Installation

1. Install osquery:
   [Instructions to install osquery according to the operating system]

2. Clone this repository:

   ```
   git clone https://github.com/ivanbtrujillo/system-security-checker-node.git
   cd system-security-checker-node
   ```

3. Install the required Node.js packages:
   ```
   npm install
   ```

## Environment Setup

To run this project, you need to set up environment variables. Follow these steps:

1. Create a `.env` file in the root of the project.

2. Add the following variables to the `.env` file:

   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Replace `your_supabase_url` and `your_supabase_anon_key` with your actual Supabase credentials.

3. Make sure the `.env` file is included in your `.gitignore` to avoid uploading sensitive information to your repository.

## Supabase Database Setup

Execute the following SQL commands in your Supabase SQL editor to create the necessary tables, set up security policies, and create functions:

```
-- Drop existing objects
DROP TABLE IF EXISTS public.security_reports;
DROP TABLE IF EXISTS public.user_logs;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create security reports table
CREATE TABLE IF NOT EXISTS public.security_reports (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    device_id TEXT NOT NULL UNIQUE,
    user_email TEXT NOT NULL,
    user_full_name TEXT NOT NULL,
    disk_encrypted BOOLEAN NOT NULL,
    encryption_type TEXT,
    antivirus_detected BOOLEAN NOT NULL,
    antivirus_name TEXT,
    screen_lock_active BOOLEAN NOT NULL,
    screen_lock_time TEXT,
    operating_system TEXT,
    os_version TEXT,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add constraint to security_reports
ALTER TABLE public.security_reports
    ADD CONSTRAINT unique_report_device
    UNIQUE (user_email, device_id);
```

## Usage

You can run the script in two ways:

Using Node.js:

```
npm start
```

## Troubleshooting

If you encounter issues with osquery:

1. Ensure osquery is correctly installed and in your system PATH.
2. On macOS, you might need to grant full disk access to osqueryi in System Preferences > Security & Privacy > Privacy > Full Disk Access.
3. On Windows, ensure you're running the script with administrator privileges.

## License

This project is licensed under the MIT License.

## Contributing

We welcome contributions! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

# Roadmap

- [ ] Linux support
- [ ] Generate a standalone executable
- [ ] Add more security checks
- [ ] UI to view the reports
- [ ] Implement two-factor authentication
- [ ] Add support for multiple languages
- [ ] Develop an API for third-party integrations
- [ ] Implement real-time notifications for security alerts
- [ ] Create an admin panel to manage users and permissions
- [ ] Optimize performance for resource-constrained systems
- [ ] Add network vulnerability analysis
- [ ] Implement an automatic update system
