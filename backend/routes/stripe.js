import express from "express";
import Stripe from "stripe";
import prisma from "../prisma/client.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Stripe webhook error:", error.message);

      return res.status(400).send("Webhook error");
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const restaurantId = session.metadata?.restaurantId;

        if (restaurantId) {
          await prisma.restaurant.update({
            where: {
              id: restaurantId,
            },
            data: {
              stripeCustomerId: session.customer || undefined,
              stripeSubscriptionId: session.subscription || undefined,
              subscriptionStatus: "active",
            },
          });
        }
      }

      if (
        event.type === "customer.subscription.deleted" ||
        event.type === "customer.subscription.paused"
      ) {
        const subscription = event.data.object;

        const restaurant = await prisma.restaurant.findFirst({
          where: {
            stripeCustomerId: subscription.customer,
          },
        });

        if (restaurant) {
          await prisma.restaurant.update({
            where: {
              id: restaurant.id,
            },
            data: {
              subscriptionStatus: "canceled",
            },
          });
        }
      }

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object;

        const restaurant = await prisma.restaurant.findFirst({
          where: {
            stripeCustomerId: invoice.customer,
          },
        });

        if (restaurant) {
          await prisma.restaurant.update({
            where: {
              id: restaurant.id,
            },
            data: {
              subscriptionStatus: "past_due",
            },
          });
        }
      }

      if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;

        const restaurant = await prisma.restaurant.findFirst({
          where: {
            stripeCustomerId: invoice.customer,
          },
        });

        if (restaurant) {
          await prisma.restaurant.update({
            where: {
              id: restaurant.id,
            },
            data: {
              subscriptionStatus: "active",
            },
          });
        }
      }

      return res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook handling error:", error);

      return res.status(500).json({
        error: "Errore gestione webhook Stripe",
      });
    }
  }
);

export default router;
