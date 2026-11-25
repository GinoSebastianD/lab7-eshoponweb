using Microsoft.eShopWeb.ApplicationCore.Entities;
using Microsoft.eShopWeb.ApplicationCore.Entities.BasketAggregate;
using Microsoft.eShopWeb.ApplicationCore.Interfaces;
using Microsoft.eShopWeb.ApplicationCore.Specifications;
using Microsoft.eShopWeb.Web.Services;
using NSubstitute;
using Xunit;

namespace Microsoft.eShopWeb.UnitTests.Web.Services;

public class BasketViewModelServiceTests
{
    private readonly IRepository<Basket> _baskets = Substitute.For<IRepository<Basket>>();
    private readonly IRepository<CatalogItem> _catalog = Substitute.For<IRepository<CatalogItem>>();
    private readonly IUriComposer _uris = Substitute.For<IUriComposer>();
    private readonly IBasketQueryService _query = Substitute.For<IBasketQueryService>();
    private BasketViewModelService Service => new(_baskets, _catalog, _uris, _query);

    [Fact]
    public async Task MapsCatalogPresentationAndBasketPriceAndQuantity()
    {
        // Arrange
        var basket = new Basket("buyer");
        basket.AddItem(0, 12m, 3);
        _catalog.ListAsync(Arg.Any<CatalogItemsSpecification>(), Arg.Any<CancellationToken>())
            .Returns(new List<CatalogItem> { new(1, 1, "Description", "Product", 99m, "pic.png") });
        _uris.ComposePicUri("pic.png").Returns("https://example.com/pic.png");
        // Act
        var model = await Service.Map(basket);
        // Assert
        Assert.Equal("buyer", model.BuyerId);
        var item = Assert.Single(model.Items);
        Assert.Equal(12m, item.UnitPrice);
        Assert.Equal(3, item.Quantity);
        Assert.Equal(0, item.CatalogItemId);
        Assert.Equal("Product", item.ProductName);
        Assert.Equal("https://example.com/pic.png", item.PictureUrl);
    }

    [Fact]
    public async Task CreatesEmptyBasketForNewUser()
    {
        // Arrange
        _baskets.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns((Basket?)null);
        // Act
        var model = await Service.GetOrCreateBasketForUser("new-user");
        // Assert
        Assert.Equal("new-user", model.BuyerId);
        Assert.Empty(model.Items);
        await _baskets.Received(1).AddAsync(Arg.Is<Basket>(b => b != null && b.BuyerId == "new-user"), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DelegatesCountingToQueryService()
    {
        // Arrange
        _query.CountTotalBasketItems("buyer").Returns(7);
        // Act
        var total = await Service.CountTotalBasketItems("buyer");
        // Assert
        Assert.Equal(7, total);
        await _query.Received(1).CountTotalBasketItems("buyer");
    }
}
