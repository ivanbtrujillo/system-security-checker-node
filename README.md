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
   git clone https://github.com/yourusername/system-security-checker-node.git
   cd system-security-checker-node
   ```

3. Install the required Node.js packages:
   ```
   npm install
   ```

## Usage

You can run the script in two ways:

1. Using Node.js:

   ```
   npm start
   ```

2. Using the standalone executable (if available):
   ```
   ./system-security-checker-node  # On Unix-based systems
   system-security-checker-node.exe  # On Windows
   ```

## Building the Executable

To build a standalone executable:

1. Run the build script:

   ```
   npm run build
   ```

2. The executables for macOS, Windows, and Linux will be created in the `dist` folder.

## Troubleshooting

If you encounter issues with osquery:

1. Ensure osquery is correctly installed and in your system PATH.
2. On macOS, you might need to grant full disk access to osqueryi in System Preferences > Security & Privacy > Privacy > Full Disk Access.
3. On Windows, ensure you're running the script with administrator privileges.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.
