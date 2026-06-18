package com.elite.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TransactionSummary {
    private Double totalIncome;
    private Double totalExpenses;
    private Double netProfit;
    private Double profitMargin;
}
