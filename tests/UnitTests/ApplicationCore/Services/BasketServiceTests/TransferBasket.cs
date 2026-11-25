using Microsoft.eShopWeb.ApplicationCore.Entities.BasketAggregate;
using Microsoft.eShopWeb.ApplicationCore.Interfaces;
using Microsoft.eShopWeb.ApplicationCore.Services;
using Microsoft.eShopWeb.ApplicationCore.Specifications;
using NSubstitute;
using Xunit;

namespace Microsoft.eShopWeb.UnitTests.ApplicationCore.Services.BasketServiceTests;

public class TransferBasket
{
    private readonly string _nonexistentAnonymousBasketBuyerId = "nonexistent-anonymous-basket-buyer-id";
    private readonly string _existentAnonymousBasketBuyerId = "existent-anonymous-basket-buyer-id";
    private readonly string _nonexistentUserBasketBuyerId = "newuser@microsoft.com";
    private readonly string _existentUserBasketBuyerId = "testuser@microsoft.com";
    private readonly IRepository<Basket> _mockBasketRepo = Substitute.For<IRepository<Basket>>();
    private readonly IAppLogger<BasketService> _mockLogger = Substitute.For<IAppLogger<BasketService>>();

    [Fact]
    public async Task InvokesBasketRepositoryFirstOrDefaultAsyncOnceIfAnonymousBasketNotExists()
    {
        // Arrange
        _mockBasketRepo.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns((Basket?)null);
        var basketService = new BasketService(_mockBasketRepo, _mockLogger);
        // Act
        await basketService.TransferBasketAsync(_nonexistentAnonymousBasketBuyerId, _existentUserBasketBuyerId);
        // Assert
        await _mockBasketRepo.Received(1).FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>());
        await _mockBasketRepo.DidNotReceive().DeleteAsync(Arg.Any<Basket>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task TransferAnonymousBasketItemsWhilePreservingExistingUserBasketItems()
    {
        // Arrange
        var anonymousBasket = new Basket(_existentAnonymousBasketBuyerId);
        anonymousBasket.AddItem(1, 10, 1);
        anonymousBasket.AddItem(3, 55, 7);
        var userBasket = new Basket(_existentUserBasketBuyerId);
        userBasket.AddItem(1, 10, 4);
        userBasket.AddItem(2, 99, 3);

        _mockBasketRepo.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns(anonymousBasket, userBasket);
        var basketService = new BasketService(_mockBasketRepo, _mockLogger);
        // Act
        await basketService.TransferBasketAsync(_existentAnonymousBasketBuyerId, _existentUserBasketBuyerId);
        // Assert
        await _mockBasketRepo.Received().UpdateAsync(userBasket, Arg.Any<CancellationToken>());

        Assert.Equal(3, userBasket.Items.Count);
        Assert.Contains(userBasket.Items, x => x.CatalogItemId == 1 && x.UnitPrice == 10 && x.Quantity == 5);
        Assert.Contains(userBasket.Items, x => x.CatalogItemId == 2 && x.UnitPrice == 99 && x.Quantity == 3);
        Assert.Contains(userBasket.Items, x => x.CatalogItemId == 3 && x.UnitPrice == 55 && x.Quantity == 7);
    }

    [Fact]
    public async Task RemovesAnonymousBasketAfterUpdatingUserBasket()
    {
        // Arrange
        var anonymousBasket = new Basket(_existentAnonymousBasketBuyerId);
        var userBasket = new Basket(_existentUserBasketBuyerId);

        _mockBasketRepo.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns(anonymousBasket, userBasket);
        var basketService = new BasketService(_mockBasketRepo, _mockLogger);
        // Act
        await basketService.TransferBasketAsync(_existentAnonymousBasketBuyerId, _existentUserBasketBuyerId);
        // Assert
        await _mockBasketRepo.Received().UpdateAsync(userBasket, Arg.Any<CancellationToken>());
        await _mockBasketRepo.Received().DeleteAsync(anonymousBasket, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreatesNewUserBasketIfNotExists()
    {
        // Arrange
        var anonymousBasket = new Basket(_existentAnonymousBasketBuyerId);
        _mockBasketRepo.FirstOrDefaultAsync(Arg.Any<BasketWithItemsSpecification>(), Arg.Any<CancellationToken>()).Returns(anonymousBasket, (Basket?)null);
        var basketService = new BasketService(_mockBasketRepo, _mockLogger);
        // Act
        await basketService.TransferBasketAsync(_existentAnonymousBasketBuyerId, _nonexistentUserBasketBuyerId);
        // Assert
        await _mockBasketRepo.Received(1).AddAsync(Arg.Is<Basket>(x => x != null && x.BuyerId == _nonexistentUserBasketBuyerId), Arg.Any<CancellationToken>());
    }
}
