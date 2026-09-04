import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PaymentGatewayModal } from "./PaymentGatewayModal";

describe("PaymentGatewayModal Integration Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    orderId: 9001,
    amount: 1499.5,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(<PaymentGatewayModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal header with total payable amount when open", () => {
    render(<PaymentGatewayModal {...defaultProps} />);
    expect(screen.getByText("SUNOTAL PAY")).toBeDefined();
    expect(screen.getByText("₹1499.50")).toBeDefined();
  });

  it("renders payment tabs: Card, UPI / QR, NetBanking, Corporate PO", () => {
    render(<PaymentGatewayModal {...defaultProps} />);
    expect(screen.getByText("Card")).toBeDefined();
    expect(screen.getByText("UPI / QR")).toBeDefined();
    expect(screen.getByText("NetBanking")).toBeDefined();
    expect(screen.getByText("Corporate PO")).toBeDefined();
  });

  it("launches 3D Secure Card Verification OTP modal on card form submit", async () => {
    render(<PaymentGatewayModal {...defaultProps} />);
    
    const payButton = screen.getByRole("button", { name: /Pay ₹1499\.50 securely/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText("3D Secure Card Verification")).toBeDefined();
      expect(screen.getByText("123456")).toBeDefined();
    });
  });

  it("completes card payment upon verifying 3D Secure OTP", async () => {
    render(<PaymentGatewayModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Pay ₹1499\.50 securely/i }));

    await waitFor(() => {
      expect(screen.getByText("Verify OTP")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify OTP" }));

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it("processes UPI payment simulation successfully", async () => {
    render(<PaymentGatewayModal {...defaultProps} />);

    fireEvent.click(screen.getByText("UPI / QR"));

    const upiButton = screen.getByRole("button", { name: /Simulate Instant UPI Payment/i });
    fireEvent.click(upiButton);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it("processes NetBanking authorization successfully", async () => {
    render(<PaymentGatewayModal {...defaultProps} />);

    fireEvent.click(screen.getByText("NetBanking"));
    fireEvent.click(screen.getByText("HDFC Bank"));

    const netbankingButton = screen.getByRole("button", { name: /Authorize via HDFC Bank/i });
    fireEvent.click(netbankingButton);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it("processes Corporate PO order submission successfully", async () => {
    render(<PaymentGatewayModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Corporate PO"));

    const poButton = screen.getByRole("button", { name: /Submit Order on Corporate PO Account/i });
    fireEvent.click(poButton);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it("initializes Razorpay Checkout SDK when Razorpay Key ID and SDK are available", async () => {
    const mockOpen = vi.fn();
    (window as any).Razorpay = vi.fn().mockImplementation(() => ({
      open: mockOpen,
    }));

    vi.spyOn(import.meta, "env", "get").mockReturnValue({
      VITE_RAZORPAY_KEY_ID: "rzp_test_1234567890",
    });

    render(<PaymentGatewayModal {...defaultProps} />);

    fireEvent.click(screen.getByText("UPI / QR"));
    const upiButton = screen.getByRole("button", { name: /Simulate Instant UPI Payment/i });
    fireEvent.click(upiButton);

    await waitFor(() => {
      expect((window as any).Razorpay).toHaveBeenCalled();
      expect(mockOpen).toHaveBeenCalled();
    });

    delete (window as any).Razorpay;
  });
});
