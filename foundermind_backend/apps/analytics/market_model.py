import math


class MarketModelEngine:

    @staticmethod
    def calculate_cagr(begin, end, years):
        if begin <= 0 or years <= 0:
            return None
        return round((end / begin) ** (1 / years) - 1, 4)

    @staticmethod
    def estimate_sam(tam, segment_ratio=0.3):
        return round(tam * segment_ratio, 2)

    @staticmethod
    def estimate_som(sam, capture_rate=0.05):
        return round(sam * capture_rate, 2)

    @staticmethod
    def normalize_tam_score(tam_billion):
        if tam_billion >= 50:
            return 10
        elif tam_billion >= 10:
            return 8
        elif tam_billion >= 1:
            return 6
        else:
            return 4

    @staticmethod
    def normalize_cagr_score(cagr):
        if not cagr:
            return 5
        if cagr >= 0.20:
            return 10
        elif cagr >= 0.10:
            return 8
        elif cagr >= 0.05:
            return 6
        else:
            return 4

    @staticmethod
    def compute_opportunity_score(tam_score, cagr_score, competition_score=6):
        return round(
            (tam_score * 0.4)
            + (cagr_score * 0.4)
            + (competition_score * 0.2),
            2
        )

    @staticmethod
    def build_market_model(data):

        tam = data.get("market_size_current_billion_usd")
        future = data.get("market_size_future_billion_usd")
        years = data.get("forecast_years")

        if not tam or not future or not years:
            return {"error": "Insufficient market data"}

        calculated_cagr = MarketModelEngine.calculate_cagr(
            tam, future, years
        )

        sam = MarketModelEngine.estimate_sam(tam)
        som = MarketModelEngine.estimate_som(sam)

        tam_score = MarketModelEngine.normalize_tam_score(tam)
        cagr_score = MarketModelEngine.normalize_cagr_score(calculated_cagr)

        opportunity_score = MarketModelEngine.compute_opportunity_score(
            tam_score,
            cagr_score
        )

        return {
            "tam_billion_usd": tam,
            "sam_billion_usd": sam,
            "som_billion_usd": som,
            "calculated_cagr": calculated_cagr,
            "tam_score": tam_score,
            "cagr_score": cagr_score,
            "opportunity_score": opportunity_score
        }