import ProductCard from './ProductCard.jsx';

// Dynamic list with a stable unique key (product._id) for every item.
export default function ProductGrid({ products, onAdd, pendingIds = {}, addDisabled = false }) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          onAdd={onAdd}
          isAdding={Boolean(pendingIds[product._id])}
          addDisabled={addDisabled}
        />
      ))}
    </div>
  );
}
