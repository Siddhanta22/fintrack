# FinanceTrack - AI-Powered Personal Finance Dashboard

A full-stack application for tracking personal finances with AI-powered categorization and insights. Built with Next.js, FastAPI, PostgreSQL, and LangChain.

## 🏗️ Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Next.js   │ ◄─────► │   FastAPI   │ ◄─────► │ PostgreSQL  │
│  Frontend   │  HTTP   │   Backend   │   SQL   │  Database   │
└─────────────┘         └─────────────┘         └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │   OpenAI    │
                        │  (LangChain)│
                        └─────────────┘
```

### Component Breakdown

**Frontend (Next.js 14)**
- React 18 with TypeScript
- React Query for state management and API calls
- Tailwind CSS for styling
- Recharts for data visualization
- Pages: Dashboard, Transactions, Insights, Budgets

**Backend (FastAPI)**
- Python 3.10+
- SQLAlchemy ORM for database operations
- JWT authentication
- CSV parsing and transaction import
- Rule-based and AI-powered categorization
- LangChain for natural language queries

**Database (PostgreSQL)**
- Stores users, accounts, transactions, categories, budgets, and rules
- Indexed for performance on common queries
- Decimal precision for financial calculations

**AI Layer**
- OpenAI GPT-3.5-turbo for categorization
- LangChain SQL agent for natural language queries
- Monthly insight generation

## 📋 Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL 12 or higher
- OpenAI API key (optional, for AI features)

## 🚀 Setup Instructions

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb financetrack

# Or using psql:
psql -U postgres
CREATE DATABASE financetrack;
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and set:
# - DATABASE_URL=postgresql://user:password@localhost:5432/financetrack
# - SECRET_KEY=your-secret-key-here
# - OPENAI_API_KEY=your-openai-api-key (optional)

# Run database migrations (tables are auto-created on startup)
# Or manually: python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.local.example .env.local
# Edit .env.local and set:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Initialize Categories (Optional)

Run this SQL to create default categories:

```sql
INSERT INTO categories (name, color, icon) VALUES
('Food & Dining', '#FF5733', 'restaurant'),
('Transport', '#3498DB', 'car'),
('Shopping', '#9B59B6', 'shopping'),
('Entertainment', '#E74C3C', 'movie'),
('Bills & Utilities', '#F39C12', 'bill'),
('Healthcare', '#1ABC9C', 'health'),
('Education', '#34495E', 'education'),
('Travel', '#16A085', 'travel'),
('Income', '#27AE60', 'income'),
('Other', '#95A5A6', 'other');
```

## 📁 Project Structure

```
financetrack/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py             # Configuration management
│   │   ├── database.py           # Database connection
│   │   ├── models.py             # SQLAlchemy ORM models
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── auth.py               # Authentication utilities
│   │   ├── routers/              # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── transactions.py
│   │   │   ├── insights.py
│   │   │   └── query.py
│   │   └── services/             # Business logic
│   │       ├── csv_parser.py
│   │       ├── categorization.py
│   │       └── ai_service.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/                      # Next.js app directory
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── insights/
│   │   └── login/
│   ├── components/               # React components
│   │   ├── UploadBox.tsx
│   │   ├── TransactionTable.tsx
│   │   ├── CategoryBadge.tsx
│   │   ├── ChartCard.tsx
│   │   └── BudgetBar.tsx
│   ├── lib/
│   │   └── api.ts                # API client
│   ├── package.json
│   └── .env.local.example
│
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (protected)

### Transactions
- `POST /api/transactions/upload` - Upload CSV file
- `GET /api/transactions` - List transactions (with filters)
- `POST /api/transactions` - Create transaction
- `POST /api/transactions/categorize` - Categorize transactions
- `GET /api/transactions/{id}` - Get transaction
- `PUT /api/transactions/{id}` - Update transaction

### Insights
- `GET /api/insights/monthly` - Get monthly insights

### Query
- `POST /api/query/nl` - Natural language query

## 📊 Database Schema

### Users
- `id`, `email`, `hashed_password`, `full_name`, `created_at`, `is_active`

### Accounts
- `id`, `user_id`, `name`, `account_type`, `balance`, `created_at`

### Transactions
- `id`, `user_id`, `account_id`, `category_id`, `date`, `description`, `amount`, `transaction_type`, `is_categorized`, `created_at`, `updated_at`

### Categories
- `id`, `name`, `color`, `icon`

### Budgets
- `id`, `user_id`, `category_id`, `month`, `year`, `limit`, `spent`, `created_at`

### Rules
- `id`, `user_id`, `category_id`, `pattern`, `pattern_type`, `priority`, `is_active`, `created_at`

## 🔄 How It Works

### CSV Upload Flow
1. User uploads CSV file via frontend
2. Backend parses CSV (flexible column detection)
3. Transactions are inserted into database
4. Duplicate detection (same date + amount + description)
5. Optional auto-categorization (rules first, then AI)

### Categorization Flow
1. **Rule-based**: Check user's rules in priority order
   - Pattern matching: contains, starts_with, exact, regex
   - First match wins
2. **AI-based**: If no rule matches and AI is enabled
   - Send transaction description to OpenAI
   - LLM suggests category
   - Map response to Category ID

### Monthly Insights Flow
1. Query transactions for the month
2. Calculate totals (income, expenses, net)
3. Group by category
4. Check budget status
5. Generate AI summary (if OpenAI key configured)

### Natural Language Query Flow
1. User asks question in plain English
2. LangChain SQL agent converts to SQL
3. Query executed (scoped to current user)
4. Results formatted in natural language
5. Return answer + raw data

## 🎨 Frontend Architecture

### State Management
- **React Query**: Handles all API calls
  - Automatic caching
  - Background refetching
  - Loading/error states
  - Optimistic updates

### Component Structure
- **Pages**: Route-level components (`/dashboard`, `/transactions`)
- **Components**: Reusable UI components
- **lib/api.ts**: Centralized API client with Axios

### Data Flow
```
User Action → Component → React Query Hook → API Client → Backend
                ↓
         Update UI State
```

## 🔒 Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Token expiration (30 minutes)
- SQL injection protection (SQLAlchemy parameterized queries)
- CORS configured for frontend origin
- User-scoped queries (all data filtered by user_id)

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest  # If tests are added
```

### Frontend Testing
```bash
cd frontend
npm test  # If tests are added
```

## 🚀 Deployment

### Backend (FastAPI)
- Use production ASGI server: `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker`
- Set environment variables in production
- Use PostgreSQL connection pooling
- Enable HTTPS

### Frontend (Next.js)
- Build: `npm run build`
- Start: `npm start`
- Or deploy to Vercel/Netlify

### Database
- Use managed PostgreSQL (AWS RDS, Heroku Postgres, etc.)
- Set up regular backups
- Monitor performance

## 📝 CSV Format

The CSV parser supports flexible column names. Required columns:
- **Date**: `date`, `transaction date`, `posted date`
- **Description**: `description`, `memo`, `details`, `transaction`
- **Amount**: `amount`, `transaction amount`

Example CSV:
```csv
Date,Description,Amount
2024-01-15,STARBUCKS STORE #1234,-5.50
2024-01-16,SALARY DEPOSIT,3000.00
```

## 🤖 AI Features

### Categorization
- Analyzes transaction descriptions
- Suggests appropriate category
- Falls back to rules if AI unavailable

### Monthly Insights
- Generates natural language summary
- Highlights spending patterns
- Identifies trends

### Natural Language Queries
- Ask questions like "How much did I spend on food?"
- Converts to SQL automatically
- Returns formatted answers

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure all dependencies installed

### CSV upload fails
- Check CSV format matches expected columns
- Verify account_id exists
- Check file size limits

### AI features not working
- Verify OPENAI_API_KEY is set
- Check API key is valid
- Ensure sufficient API credits

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [LangChain Documentation](https://python.langchain.com/)

## 📄 License

MIT License

## 👥 Contributing

Contributions welcome! Please open an issue or submit a pull request.

