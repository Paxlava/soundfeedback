import * as React from "react";
import ReviewsPage from "@/components/ReviewsPage";

const AdminReviews = () => {
  return <ReviewsPage title="Рецензии редакции" isAdmin={true} />;
};

export default AdminReviews;