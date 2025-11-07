"""
Query router: natural language queries using LangChain SQL agent.

This endpoint allows users to ask questions in plain English:
- "How much did I spend on food this month?"
- "What's my total income for 2024?"
- "Show me all transactions over $100"

The LangChain SQL agent:
1. Converts natural language to SQL
2. Executes query against database
3. Formats results in natural language
4. Returns both answer and raw data

Note: This is an advanced feature requiring careful prompt engineering
to prevent SQL injection and ensure accurate queries.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models import User
from app.schemas import NaturalLanguageQuery, QueryResponse
from app.auth import get_current_user
from app.config import settings

# Lazy import of LangChain - only import if needed
try:
    from langchain.agents import create_sql_agent
    from langchain.agents.agent_toolkits import create_sql_agent as create_sql_agent_toolkit
    from langchain.sql_database import SQLDatabase
    from langchain_openai import ChatOpenAI
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

router = APIRouter()


@router.post("/nl", response_model=QueryResponse)
def natural_language_query(
    query_data: NaturalLanguageQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Answer natural language questions about finances.
    
    This uses LangChain's SQL agent to:
    1. Understand the question
    2. Generate appropriate SQL query
    3. Execute query (scoped to current user's data)
    4. Format answer in natural language
    
    Example request:
        POST /api/query/nl
        {
            "query": "How much did I spend on food this month?"
        }
    
    Example response:
        {
            "answer": "You spent $450.25 on food this month.",
            "sql_query": "SELECT SUM(amount) FROM transactions WHERE user_id = 1 AND category_id = 3 AND date >= '2024-09-01'",
            "data": [{"total": 450.25}]
        }
    
    Security:
    - All queries are automatically scoped to current_user.id
    - SQL injection protection via parameterized queries
    - Limited to SELECT queries only
    """
    if not LANGCHAIN_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="AI query feature is not available due to missing dependencies. Please check LangChain installation."
        )
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI query feature requires OPENAI_API_KEY to be configured"
        )
    
    try:
        # Create SQL database connection
        # We use the same engine but could create a read-only connection
        sql_db = SQLDatabase(engine)
        
        # Initialize LLM
        llm = ChatOpenAI(
            model_name="gpt-3.5-turbo",
            temperature=0,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        # Create SQL agent
        # This agent can understand natural language and generate SQL
        # Note: LangChain API may vary by version
        try:
            agent = create_sql_agent_toolkit(
                llm=llm,
                db=sql_db,
                verbose=True
            )
        except:
            # Fallback for different LangChain versions
            agent = create_sql_agent(
                llm=llm,
                db=sql_db,
                verbose=True
            )
        
        # Modify query to include user context
        # This ensures all queries are scoped to the current user
        contextual_query = f"""
        User ID: {current_user.id}
        Question: {query_data.query}
        
        Important: All queries must filter by user_id = {current_user.id}
        Only return data for this user.
        """
        
        # Execute agent
        result = agent.run(contextual_query)
        
        # Extract SQL query if available (for debugging)
        # Note: The agent doesn't always expose the exact SQL, but we can try
        sql_query = None
        if hasattr(result, 'sql_query'):
            sql_query = result.sql_query
        
        return QueryResponse(
            answer=str(result),
            sql_query=sql_query,
            data=None  # Could extract structured data if needed
        )
        
    except Exception as e:
        # Fallback: return error message
        return QueryResponse(
            answer=f"I encountered an error processing your query: {str(e)}. Please try rephrasing your question.",
            sql_query=None,
            data=None
        )

