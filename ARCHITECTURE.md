# FinanceTrack Architecture Deep Dive

This document explains the architectural decisions, design patterns, and implementation details of FinanceTrack.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Database Design](#database-design)
5. [AI Integration](#ai-integration)
6. [Security Considerations](#security-considerations)
7. [Performance Optimizations](#performance-optimizations)

## System Architecture

### High-Level Overview

FinanceTrack follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│                  (Next.js Frontend)                       │
│  - React Components                                      │
│  - React Query (State Management)                        │
│  - Axios (HTTP Client)                                   │
└────────────────────┬──────────────────────────────────────┘
                     │ HTTP/REST API
                     │ (JSON)
┌────────────────────▼──────────────────────────────────────┐
│                    Application Layer                      │
│                  (FastAPI Backend)                        │
│  - Route Handlers                                        │
│  - Business Logic                                        │
│  - Authentication                                        │
│  - CSV Parsing                                           │
│  - Categorization Engine                                 │
└────────────────────┬──────────────────────────────────────┘
                     │ SQL
                     │
┌────────────────────▼──────────────────────────────────────┐
│                      Data Layer                           │
│                  (PostgreSQL)                             │
│  - User Data                                             │
│  - Transactions                                          │
│  - Categories, Budgets, Rules                            │
└───────────────────────────────────────────────────────────┘
```

### Communication Flow

1. **User Action** → Frontend component triggers React Query mutation
2. **API Call** → Axios sends HTTP request with JWT token
3. **Backend Processing** → FastAPI route handler processes request
4. **Database Query** → SQLAlchemy executes SQL query
5. **Response** → JSON response sent back to frontend
6. **UI Update** → React Query updates cache and re-renders components

## Backend Architecture

### FastAPI Application Structure

```
app/
├── main.py              # Application entry point, middleware, route registration
├── config.py            # Configuration management (Pydantic Settings)
├── database.py          # Database connection, session management
├── models.py            # SQLAlchemy ORM models (database schema)
├── schemas.py           # Pydantic schemas (API contracts)
├── auth.py              # Authentication utilities (JWT, password hashing)
├── routers/             # Route handlers (REST endpoints)
│   ├── auth.py
│   ├── transactions.py
│   ├── insights.py
│   └── query.py
└── services/            # Business logic (reusable across routes)
    ├── csv_parser.py
    ├── categorization.py
    └── ai_service.py
```

### Design Patterns Used

#### 1. Dependency Injection
FastAPI's dependency injection system is used extensively:

```python
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    # Automatically extracts user from JWT token
    # Provides database session
```

**Benefits:**
- Automatic request validation
- Reusable authentication logic
- Easy testing (can mock dependencies)

#### 2. Repository Pattern (Implicit)
Services encapsulate database operations:

```python
# services/categorization.py
def categorize_transaction(transaction, db, use_ai):
    # Business logic separated from route handlers
    # Can be reused across different endpoints
```

#### 3. Strategy Pattern
Categorization uses strategy pattern:
- Rule-based strategy (fast, deterministic)
- AI-based strategy (fallback, intelligent)

### Request/Response Flow

**Example: CSV Upload**

```
1. Client uploads file
   POST /api/transactions/upload?account_id=1

2. FastAPI receives request
   - Validates JWT token (get_current_user dependency)
   - Extracts file from multipart/form-data
   - Gets database session (get_db dependency)

3. Route handler (transactions.py)
   - Verifies account belongs to user
   - Calls csv_parser.parse_csv_file()
   - Inserts transactions into database
   - Optionally calls categorization service

4. Response
   - Returns TransactionUploadResponse with statistics
   - Frontend updates UI via React Query
```

### Error Handling

**Layered Error Handling:**
1. **Pydantic Validation**: Automatic request validation
2. **Route Handlers**: Business logic errors (404, 400)
3. **Global Exception Handler**: Catches unhandled exceptions

```python
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    # Logs error, returns 500 with safe message
```

## Frontend Architecture

### Next.js App Router Structure

```
app/
├── layout.tsx           # Root layout (providers, global styles)
├── page.tsx            # Home page (redirects to dashboard)
├── dashboard/          # Dashboard page
├── transactions/       # Transactions page
├── insights/           # Insights page
├── login/              # Login page
└── register/           # Registration page

components/             # Reusable UI components
lib/                    # Utilities (API client)
```

### State Management with React Query

**Why React Query?**
- Automatic caching (reduces API calls)
- Background refetching (keeps data fresh)
- Optimistic updates (instant UI feedback)
- Built-in loading/error states

**Query Pattern:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['transactions', filters],
  queryFn: () => transactionsApi.list(filters),
});
```

**Mutation Pattern:**
```typescript
const mutation = useMutation({
  mutationFn: (file: File) => transactionsApi.upload(file, accountId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  },
});
```

### Component Architecture

**Component Hierarchy:**
```
Page Component (Dashboard)
  ├── ChartCard (wrapper)
  │   └── Recharts PieChart
  ├── TransactionTable
  │   └── TransactionRow
  │       └── CategoryBadge
  └── BudgetBar
```

**Props Flow:**
- Data flows down (parent → child)
- Events flow up (child → parent via callbacks)
- Shared state via React Query cache

### API Client Design

**Centralized API Client (`lib/api.ts`):**
- Single Axios instance
- Request interceptor: adds JWT token
- Response interceptor: handles 401 (logout)
- Type-safe API methods

**Benefits:**
- Consistent error handling
- Automatic authentication
- Easy to mock for testing

## Database Design

### Schema Design Principles

1. **Normalization**: Eliminates data redundancy
   - Users, Accounts, Transactions are separate tables
   - Categories are shared (not duplicated per user)

2. **Foreign Keys**: Enforce referential integrity
   - `transaction.user_id` → `users.id`
   - `transaction.category_id` → `categories.id`

3. **Indexes**: Optimize common queries
   - `idx_user_date` on `(user_id, date)` for date range queries
   - Indexes on foreign keys for fast joins

4. **Decimal Precision**: Use `Numeric(10, 2)` for money
   - Avoids floating-point precision errors
   - Stores exactly 2 decimal places

### Query Patterns

**Common Queries:**

1. **Get user's transactions for a month:**
```sql
SELECT * FROM transactions
WHERE user_id = ? 
  AND EXTRACT(month FROM date) = ?
  AND EXTRACT(year FROM date) = ?
ORDER BY date DESC;
```

2. **Category breakdown:**
```sql
SELECT c.name, SUM(ABS(t.amount)) as total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = ? AND t.amount < 0
GROUP BY c.name;
```

3. **Budget status:**
```sql
SELECT b.*, 
       COALESCE(SUM(ABS(t.amount)), 0) as spent
FROM budgets b
LEFT JOIN transactions t ON t.category_id = b.category_id
WHERE b.user_id = ? AND b.month = ? AND b.year = ?
GROUP BY b.id;
```

### Migration Strategy

Currently using SQLAlchemy's `Base.metadata.create_all()` for simplicity.

**Production Recommendation:**
- Use Alembic for migrations
- Version control schema changes
- Rollback capability

## AI Integration

### Categorization Flow

```
Transaction Description
    │
    ├─► Rule Engine (Priority Order)
    │   ├─ Pattern: "STARBUCKS" → Category: "Food"
    │   └─ Pattern: "AMAZON" → Category: "Shopping"
    │
    └─► AI Service (If no rule matches)
        ├─ Build prompt with description + categories
        ├─ Call OpenAI GPT-3.5-turbo
        ├─ Parse response (category name)
        └─ Map to Category ID
```

### Prompt Engineering

**Categorization Prompt:**
```
You are a financial categorization assistant.
Analyze transaction descriptions and assign categories.

Transaction: {description}
Categories: {list}

Return only the category name.
```

**Monthly Summary Prompt:**
```
Generate a concise monthly financial summary.

Financial Data:
- Total Income: $X
- Total Expenses: $Y
- Top Categories: ...

Write a 2-3 sentence summary.
```

### Natural Language Query

**LangChain SQL Agent:**
1. User asks: "How much did I spend on food?"
2. Agent converts to SQL:
   ```sql
   SELECT SUM(amount) FROM transactions
   WHERE user_id = ? AND category_id IN (
     SELECT id FROM categories WHERE name ILIKE '%food%'
   )
   ```
3. Executes query (scoped to user)
4. Formats result: "You spent $450.25 on food."

**Security:**
- All queries scoped to `current_user.id`
- Parameterized queries (SQL injection protection)
- Limited to SELECT queries

## Security Considerations

### Authentication

1. **Password Storage:**
   - Bcrypt hashing (one-way, slow by design)
   - Salt rounds: 12 (default)
   - Never store plain text

2. **JWT Tokens:**
   - Signed with secret key
   - Expires after 30 minutes
   - Stored in localStorage (frontend)
   - Sent in Authorization header

3. **Token Validation:**
   - Verified on every protected route
   - Invalid tokens → 401 Unauthorized
   - Auto-redirect to login

### Authorization

**User Scoping:**
- All queries filter by `user_id`
- Users can only access their own data
- Account ownership verified before operations

**Example:**
```python
# Always filter by user_id
transactions = db.query(Transaction).filter(
    Transaction.user_id == current_user.id
).all()
```

### Data Validation

1. **Pydantic Schemas:**
   - Automatic request validation
   - Type checking
   - Constraint validation (min_length, etc.)

2. **SQL Injection Protection:**
   - SQLAlchemy parameterized queries
   - Never use string formatting for SQL

## Performance Optimizations

### Backend

1. **Database Indexes:**
   - Composite index on `(user_id, date)`
   - Indexes on foreign keys

2. **Query Optimization:**
   - Use `joinedload()` for eager loading relationships
   - Pagination for large result sets
   - Limit query results (default: 100)

3. **Caching (Future):**
   - Redis for frequently accessed data
   - Cache category lists
   - Cache monthly insights

### Frontend

1. **React Query Caching:**
   - 5-minute stale time
   - 10-minute cache time
   - Background refetching

2. **Code Splitting:**
   - Next.js automatic code splitting
   - Lazy load heavy components

3. **Image Optimization:**
   - Next.js Image component (if images added)

## Scalability Considerations

### Current Limitations

1. **Single Database:**
   - All users share one PostgreSQL instance
   - No horizontal scaling

2. **Synchronous Processing:**
   - CSV upload blocks until complete
   - AI categorization is synchronous

### Future Improvements

1. **Background Jobs:**
   - Use Celery for async CSV processing
   - Queue AI categorization requests

2. **Database Sharding:**
   - Partition by user_id
   - Read replicas for analytics

3. **Caching Layer:**
   - Redis for session storage
   - Cache frequently accessed data

4. **CDN:**
   - Serve static assets via CDN
   - Reduce server load

## Testing Strategy

### Backend Testing

**Unit Tests:**
- Test services in isolation
- Mock database calls
- Test categorization logic

**Integration Tests:**
- Test API endpoints
- Use test database
- Test authentication flow

### Frontend Testing

**Component Tests:**
- React Testing Library
- Test user interactions
- Mock API calls

**E2E Tests:**
- Playwright or Cypress
- Test full user flows
- CSV upload → categorization → insights

## Deployment Considerations

### Environment Variables

**Backend:**
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key
- `OPENAI_API_KEY`: OpenAI API key

**Frontend:**
- `NEXT_PUBLIC_API_URL`: Backend API URL

### Production Checklist

- [ ] Use production-grade ASGI server (Gunicorn + Uvicorn)
- [ ] Enable HTTPS
- [ ] Set secure CORS origins
- [ ] Use strong SECRET_KEY
- [ ] Enable database connection pooling
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure backups
- [ ] Set up CI/CD pipeline

## Conclusion

FinanceTrack follows modern best practices:
- **Separation of Concerns**: Clear boundaries between layers
- **Type Safety**: TypeScript + Pydantic
- **Security**: Authentication, authorization, validation
- **Performance**: Indexes, caching, pagination
- **Maintainability**: Modular code, clear documentation

The architecture is designed to be:
- **Scalable**: Can handle growth with proper infrastructure
- **Maintainable**: Clear structure, well-documented
- **Secure**: Multiple layers of security
- **Extensible**: Easy to add new features

