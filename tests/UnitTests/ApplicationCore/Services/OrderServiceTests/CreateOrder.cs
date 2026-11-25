using Mediator;
using Microsoft.eShopWeb.ApplicationCore.Entities;
using Microsoft.eShopWeb.ApplicationCore.Entities.BasketAggregate;
using Microsoft.eShopWeb.ApplicationCore.Entities.OrderAggregate;
using Microsoft.eShopWeb.ApplicationCore.Entities.OrderAggregate.Events;
using Microsoft.eShopWeb.ApplicationCore.Exceptions;
using Microsoft.eShopWeb.ApplicationCore.Interfaces;
using Microsoft.eShopWeb.ApplicationCore.Services;
using Microsoft.eShopWeb.ApplicationCore.Specifications;
using NSubstitute;
using Xunit;

namespace Microsoft.eShopWeb.UnitTests.ApplicationCore.Services.OrderServiceTests;

public class CreateOrder
{
    private readonly IRepository<Basket> _baskets = Substitute.For<IRepository<Basket>>();
    private readonly IRepository<CatalogItem> _catalog = Substitute.For<IRepository<CatalogItem>>();
    private readonly IRepository<Order> _orders = Substitute.For<IRepository<Order>>();
    private readonly IUriComposer _uris = Substitute.For<IUriComposer>();
    private readonly IMediator _mediator = Substitute.For<IMediator>();
    private readonly Address _address = new("Street", "City", "State", "Country", "12345");
    private OrderService Service => new(_baskets, _catalog, _orders, _uris, _mediator);

    [Fact]
    public async Task SavesBasketPricesWithCatalogMetadataThenPublishesOrder()
    {
        // Arrange: catalog price intentionally differs from the agreed basket price.
        var basket = new Basket("buyer");
        basket.AddItem(1, 12m, 3);
        var catalogItem = Substitute.For<CatalogItem>(1, 1, "Description", "Product", 99m, "pic.png");
        catalogItem.Id.Returns(1);
        _baskets.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns(basket);
        _catalog.ListAsync(Arg.Any<CatalogItemsSpecification>(), Arg.Any<CancellationToken>()).Returns(new List<CatalogItem> { catalogItem });
        _uris.ComposePicUri("pic.png").Returns("https://example.com/pic.png");
        Order? saved = null;
        _orders.AddAsync(Arg.Do<Order>(o => saved = o), Arg.Any<CancellationToken>()).Returns<Order>(call => call.Arg<Order>());

        // Act
        await Service.CreateOrderAsync(1, _address);

        // Assert
        Assert.NotNull(saved);
        Assert.Equal("buyer", saved.BuyerId);
        Assert.Same(_address, saved.ShipToAddress);
        var line = Assert.Single(saved.OrderItems);
        Assert.Equal(12m, line.UnitPrice);
        Assert.Equal(3, line.Units);
        Assert.Equal(36m, saved.Total());
        Assert.Equal("Product", line.ItemOrdered.ProductName);
        Assert.Equal("https://example.com/pic.png", line.ItemOrdered.PictureUri);
        await _orders.Received(1).AddAsync(saved, Arg.Any<CancellationToken>());
        await _mediator.Received(1).Publish(Arg.Is<OrderCreatedEvent>(e => e != null && e.Order == saved), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RejectsMissingBasketBeforePersistence()
    {
        // Arrange
        _baskets.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns((Basket?)null);
        // Act
        var error = await Assert.ThrowsAsync<ArgumentNullException>(() => Service.CreateOrderAsync(99, _address));
        // Assert
        Assert.Equal("basket", error.ParamName);
        await _orders.DidNotReceive().AddAsync(Arg.Any<Order>(), Arg.Any<CancellationToken>());
        await _mediator.DidNotReceive().Publish(Arg.Any<OrderCreatedEvent>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RejectsEmptyBasketBeforePersistence()
    {
        // Arrange
        _baskets.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns(new Basket("buyer"));
        // Act
        await Assert.ThrowsAsync<EmptyBasketOnCheckoutException>(() => Service.CreateOrderAsync(1, _address));
        // Assert
        await _orders.DidNotReceive().AddAsync(Arg.Any<Order>(), Arg.Any<CancellationToken>());
        await _mediator.DidNotReceive().Publish(Arg.Any<OrderCreatedEvent>(), Arg.Any<CancellationToken>());
    }
}
