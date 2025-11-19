from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from io import BytesIO

app = FastAPI()

# Allow frontend and Node.js server to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(BytesIO(contents))
        else:
            df = pd.read_excel(BytesIO(contents))
    except Exception as e:
        return {"error": f"Failed to parse file: {str(e)}"}

    # Compute stats safely
    stats = {
        "mean": df.mean(numeric_only=True).to_dict(),
        "median": df.median(numeric_only=True).to_dict(),
        "mode": df.mode(numeric_only=True).iloc[0].to_dict() if not df.mode().empty else {},
        "count": df.count().to_dict()
    }

    # Trend interpretation: very basic sample logic
    trend = "Increasing" if df.select_dtypes(include=np.number).diff().mean().mean() > 0 else "Stable/Decreasing"

    return {
        "columns": df.columns.tolist(),
        "data": df.head(50).to_dict(orient="records"),  # preview subset
        "stats": stats,
        "trend": trend
    }
