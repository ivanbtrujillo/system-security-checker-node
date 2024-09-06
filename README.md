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
-- Create table to store user logs
CREATE TABLE IF NOT EXISTS
  public.user_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

-- Enable RLS on user_logs table
ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy for user_logs (adjust according to your needs)
CREATE POLICY "Users can view their own logs" ON public.user_logs FOR
SELECT
  USING (auth.uid () = user_id);

-- Create a function to log new users
CREATE
OR REPLACE FUNCTION public.log_new_user (user_id UUID, email TEXT) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_logs (user_id, email)
    VALUES (user_id, email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on auth.users that calls the log_new_user function
CREATE
OR REPLACE FUNCTION public.trigger_log_new_user () RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.log_new_user(NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_new_user_trigger
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.trigger_log_new_user ();

-- Create table to store security reports
CREATE TABLE IF NOT EXISTS
  public.security_reports (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    report_id UUID NOT NULL,
    user_id UUID NOT NULL,
    report_details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

-- Enable RLS on security_reports table
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;

-- Create a policy for security_reports (adjust according to your needs)
CREATE POLICY "Users can view their own security reports" ON public.security_reports FOR
SELECT
  USING (auth.uid () = user_id);

-- Create a function to log new security reports
CREATE
OR REPLACE FUNCTION public.log_new_security_report (report_id UUID, user_id UUID, report_details TEXT) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.security_reports (report_id, user_id, report_details)
    VALUES (report_id, user_id, report_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on security_reports that calls the log_new_security_report function
CREATE
OR REPLACE FUNCTION public.trigger_log_new_security_report () RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.log_new_security_report(NEW.report_id, NEW.user_id, NEW.report_details);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_new_security_report_trigger
AFTER INSERT ON public.security_reports FOR EACH ROW
EXECUTE FUNCTION public.trigger_log_new_security_report ();
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
