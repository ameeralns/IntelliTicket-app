# IntelliTicket

IntelliTicket is a modern, full-stack customer support ticketing system built with Next.js 14, Supabase, and TypeScript. It provides a comprehensive platform for managing customer support tickets, knowledge base articles, and user management.

## Features

- 🎫 **Ticket Management**: Create, track, and resolve customer support tickets
- 👥 **Multi-Role System**: Support for Customers, Agents, and Administrators
- 📚 **Knowledge Base**: Create and manage help articles with categories
- 🔒 **Secure Authentication**: Powered by Supabase Auth
- 🎨 **Modern UI**: Built with Tailwind CSS and Shadcn/ui components
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Shadcn/ui
- **State Management**: React Query
- **Forms**: React Hook Form with Zod validation

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/intelliticket.git
cd intelliticket
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/         # Reusable UI components
├── lib/               # Utilities, hooks, and types
├── database/          # Database schema and RLS policies
└── styles/           # Global styles and Tailwind config
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
